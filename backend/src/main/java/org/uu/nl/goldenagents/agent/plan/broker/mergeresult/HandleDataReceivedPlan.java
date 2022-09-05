package org.uu.nl.goldenagents.agent.plan.broker.mergeresult;

import org.apache.jena.rdf.model.Model;
import org.uu.nl.goldenagents.netmodels.fipa.GAMessageContentWrapper;
import org.uu.nl.goldenagents.netmodels.fipa.GAMessageHeader;
import org.uu.nl.goldenagents.netmodels.fipa.SubGraph;
import org.uu.nl.net2apl.core.agent.PlanToAgentInterface;
import org.uu.nl.net2apl.core.defaults.messenger.MessageReceiverNotFoundException;
import org.uu.nl.net2apl.core.fipa.acl.ACLMessage;
import org.uu.nl.net2apl.core.fipa.acl.FIPASendableObject;
import org.uu.nl.net2apl.core.fipa.acl.Performative;
import org.uu.nl.net2apl.core.platform.PlatformNotFoundException;

import java.io.IOException;

/**
 * This plan handles (partial) results send from a data source agent in reply to a subquery the broker sent
 */
public class HandleDataReceivedPlan extends MergeResultPlan{

    public HandleDataReceivedPlan(ACLMessage message, GAMessageHeader header, FIPASendableObject content) {
        super(message, header, content);
    }

    @Override
    protected void handleMessage(PlanToAgentInterface planInterface) {
        logger.log(MergeResultPlan.class, String.format(
                "Received a partial model from DB Agent %s in conversation %s",
                this.datasourceAgent.getName().getFragment(),
                this.conversationID));

        try {
            final Model model = ((SubGraph) content).getModel();
            long nAddedItems = this.model.addPartialModel(this.datasourceAgent, model);
            long dataSize = this.model.getTotalSize();

            logUpdate(String.format(
                    "Added %d statements to model for data source %s. Model size is now %d",
                    nAddedItems,
                    this.datasourceAgent.getName().getFragment(),
                    dataSize));

            this.publisher.publishQueryProgress(createQueryProgress(dataSize, nAddedItems));

            // Acknowledge results to data source, so a new batch of results may be initiated
            ACLMessage response = this.message.createReply(planInterface.getAgentID(), Performative.QUERY_REF);
            response.setContentObject(new GAMessageContentWrapper(GAMessageHeader.BROKER_ACK));

            planInterface.getAgent().sendMessage(response);
        } catch (IOException | MessageReceiverNotFoundException | PlatformNotFoundException e) {
            logger.log(MergeResultPlan.class, e);
        }
    }
}
